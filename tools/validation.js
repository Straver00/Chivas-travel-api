import { z } from 'zod';

export class Validation {
  static correo(email) {
    const schema = z.string('El correo tiene que ser un texto').email('El correo electrónico no es válido');
    const result = schema.safeParse(String(email));
   
    if (!result.success) {
      throw new Error(result.error.errors.map(e => e.message).join(', '));
    }
  }

  static documento(document) {
    const schema = z.string('El documento tiene que ser un texto').min(4, 'El documento debe tener al menos 8 caracteres').transform(Number);
    const result = schema.safeParse(String(document));
   
    if (!result.success) {
      throw new Error(result.error.errors.map(e => e.message).join(', '));
    }
  }

  static fullName(name) {
    const schema = z.string()
      .min(2, 'El nombre completo debe tener al menos 2 caracteres')
      .regex(/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/, 'El nombre solo debe contener letras y espacios');

    const result = schema.safeParse(String(name));

    if (!result.success) {
      throw new Error(result.error.errors.map(e => e.message).join(', '));
    }
  }

  static phone(phone) {
    const schema = z.string()
      .min(7, 'El número de teléfono debe tener al menos 7 caracteres')
      .regex(/^\d+$/, 'El número de teléfono debe contener solo dígitos');

    const result = schema.safeParse(String(phone));

    if (!result.success) {
      throw new Error(result.error.errors.map(e => e.message).join(', '));
    }
  }
 
  static mayorDeEdad(fecha_nacimiento) {
    const schema = z.string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'La fecha de nacimiento debe estar en el formato YYYY-MM-DD'
      )
      .refine(value => {
        const birthDate = new Date(value);
        const today = new Date();
        
        // Asegúrate de que la fecha de nacimiento sea válida
        if (isNaN(birthDate.getTime())) {
          return false;
        }

        // Calcular la edad
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();
        
        // Ajustar si la fecha de nacimiento aún no ha ocurrido en el año actual
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
          return age - 1 >= 18;
        }
        
        return age >= 18;
      }, 'El usuario debe ser mayor de edad');
    
    const result = schema.safeParse(fecha_nacimiento);

    if (!result.success) {
      // Lanzar un error con el mensaje de la validación
      throw new Error(result.error.errors.map(e => e.message).join(', '));
    }
  }

  static password(password) {
    const schema = z.string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(100, 'La contraseña no puede tener más de 100 caracteres')
      .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
      .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
      .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
      .regex(/[\W_]/, 'La contraseña debe contener al menos un carácter especial');

    const passwordValidationResult = schema.safeParse(String(password));

    if (!passwordValidationResult.success) {
      throw new Error(passwordValidationResult.error.errors.map(error => error.message).join(', '));
    }
  }
}
